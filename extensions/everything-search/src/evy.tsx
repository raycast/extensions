import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import * as ftp from "basic-ftp";

/**
 * This defines the "evy" command for Raycast, which allows users to search for files
 * across multiple ETP/FTP servers using a file mask.
 * The command connects to each server, performs a search using the provided mask,
 * and displays the results in an infinite scrolling list that fetches more results
 * as the user scrolls.
 *
 * NOTE: Currently non-secure connections are used.
 */

const DEBUG = false; // Set to true to enable debug logging

/**
 * Define structure of ETP server definition, the server is expected to have:
 * - name: a human-readable name for the server
 * - host: the hostname or IP address of the ETP/FTP server
 * - port: the port number to connect to (default FTP is 21)
 * - user: the username for authentication
 * - pass: the password for authentication
 */
type Server = {
  name: string;
  host: string;
  port: number;
  user: string;
  pass: string;
};

/**
 * Those are Raycast preferences that are expected to be set in the extension's preferences.
 * The `serversJSON` should be a JSON string representing an array of `Server` objects
 * (e.g. `[{"name": "My Server", "host": "192.168.1.100", "port": 21, "user": "admin", "pass": "password"}]`)
 */
interface Preferences {
  serversJSON: string;
}

/**
 * Arguments for the command, which includes a file mask to search for.
 * The mask can be a glob pattern like `*.jpg` or `*.txt`.
 * If no mask is provided, it defaults to `*.jpg`.
 */
interface Arguments {
  mask: string;
}

type Result = {
  server: string;
  name: string;
  path: string;
  size: number;
  isFolder?: boolean; // Optional, to indicate if the result is a folder
};

/**
 * Default number of results to fetch per page. After user scrolls to the bottom,
 * more results will be fetched from the servers.
 */
const RESULTS_PER_PAGE = 20;

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: Arguments }>) {
  const { serversJSON } = getPreferenceValues<Preferences>();
  let servers: Server[] = [];

  try {
    servers = JSON.parse(serversJSON);
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid JSON in preferences",
    });
  }

  const [mask, setMask] = useState<string>(args.mask || "*.jpg");
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    hasMore: true,
    pageSize: RESULTS_PER_PAGE,
  });

  /**
   * When the user searches for a file mask, this function is called to fetch results
   * from all configured ETP/FTP servers.
   * It connects to each server, performs the search using the provided mask,
   * and aggregates the results.
   * @param offset offset for pagination, defaults to 0, then it will fetch results starting from the beginning.
   *                If the user scrolls down, it will fetch more results starting from the current offset.
   * @param reset if true, it will reset the results and pagination state,
   *              otherwise it will append new results to the existing ones.
   *              This is useful when the user changes the search mask.
   *              If the user changes the mask, we want to reset the results and pagination state
   *              to start fresh with the new search.
   *              If the user scrolls down, we want to append new results to the existing ones
   *              and keep the pagination state as is.
   *              This way, the user can scroll down to load more results without losing the previous
   *              results or pagination state.
   * @returns results from all servers that match the provided mask.
   *          Each result contains the server name, file name, full path, and file size.
   */
  const fetchResults = async (offset: number = 0, reset: boolean = false) => {
    if (!mask) {
      setResults([]);
      return;
    }

    const sanitizedMask = mask.replace(/[\r\n]+/g, "").trim();
    if (!sanitizedMask) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid file mask",
        message: "Mask can’t be empty or contain newlines.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const allResults: Result[] = [];
      const serverResultCounts: number[] = [];

      // Connect to each server and fetch results in parallel
      await Promise.all(
        servers.map(async (srv, serverIndex) => {
          const client = new ftp.Client(5000);
          client.ftp.verbose = DEBUG;

          try {
            await client.access({
              host: srv.host,
              port: srv.port,
              user: srv.user,
              password: srv.pass,
              secure: false,
            });

            // Calculate offset per server (divide total offset by number of servers)
            const serverOffset = Math.floor(offset / servers.length);

            // Those are ETP commands to search for files
            // The commands are sent to the server to perform the search
            // The mask is used to filter the results, e.g. "*.jpg" will return
            // all files that match the pattern in the server's file system.
            const cmds = [
              "EVERYTHING CASE 0",
              "EVERYTHING PATH 0",
              `EVERYTHING SEARCH ${sanitizedMask}`,
              `EVERYTHING OFFSET ${serverOffset}`,
              `EVERYTHING COUNT ${RESULTS_PER_PAGE}`,
              "EVERYTHING PATH_COLUMN 1",
              "EVERYTHING SIZE_COLUMN 1",
              "EVERYTHING QUERY",
            ];

            // send all but the final QUERY
            for (const cmd of cmds.slice(0, -1)) {
              const res = await client.send(cmd);
              if (DEBUG) {
                console.log(`### ETP → ${cmd}:`, res.code, res.message);
              }
            }

            // grab the full multiline QUERY response
            const queryRes = await client.send(cmds[cmds.length - 1], true);
            const lines = queryRes.message.split(/\r?\n/).map((l) => l.trim());

            let currPath = "";
            let currSize = 0;
            const serverResults: Result[] = [];

            // Parse the response lines to extract file information
            // Each line starts with a keyword (e.g. "PATH ", "SIZE ", "FILE ")
            for (const line of lines) {
              if (line.startsWith("PATH ")) {
                currPath = line.substring(5);
              } else if (line.startsWith("SIZE ")) {
                currSize = Number(line.substring(5));
              } else if (line.startsWith("FILE ")) {
                const name = line.substring(5);
                serverResults.push({
                  server: srv.name,
                  name,
                  path: `${currPath}\\${name}`,
                  size: currSize,
                });
              } else if (line.startsWith("FOLDER ")) {
                serverResults.push({
                  server: srv.name,
                  name: line.substring(7),
                  path: `${currPath}\\${line.substring(7)}`,
                  size: currSize,
                  isFolder: true,
                });
              }
            }

            serverResultCounts[serverIndex] = serverResults.length;
            allResults.push(...serverResults);

            if (DEBUG) {
              console.log(
                `Server ${srv.name} returned ${serverResults.length} results`,
              );
            }
          } catch (error) {
            console.error(`Error on server ${srv.name}:`, error);
            serverResultCounts[serverIndex] = 0;
          } finally {
            client.close();
          }
        }),
      );

      // Check if ANY server returned a full page - if so, there might be more results
      const hasMore = serverResultCounts.some(
        (count) => count === RESULTS_PER_PAGE,
      );

      if (DEBUG) {
        console.log(
          `Got ${allResults.length} total results from servers:`,
          serverResultCounts,
        );
        console.log(
          `hasMore: ${hasMore} (at least one server returned ${RESULTS_PER_PAGE} results)`,
        );
      }

      setResults((prev) => (reset ? allResults : [...prev, ...allResults]));
      setPagination({ hasMore, pageSize: RESULTS_PER_PAGE });
    } catch (error) {
      console.error("Error fetching results:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching results",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * This function is called when the user scrolls to the bottom of the list
   * to load more results.
   * @returns results from all servers that match the provided mask,
   *          starting from the current offset.
   */
  const onLoadMore = () => {
    if (!pagination.hasMore) return;

    const currentOffset = results.length;
    console.log("Loading more results, current offset:", currentOffset);
    fetchResults(currentOffset, false);
  };

  /**
   * On startup, fetch results for the initial mask.
   */
  useEffect(() => {
    fetchResults(0, true);
  }, [mask]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(newMask) => {
        setMask(newMask);
        setResults([]);
        setPagination({ hasMore: true, pageSize: RESULTS_PER_PAGE });
      }}
      searchBarPlaceholder="File mask (e.g. *.jpg)"
      searchText={mask}
      pagination={{
        hasMore: pagination.hasMore,
        pageSize: pagination.pageSize,
        onLoadMore,
      }}
    >
      {results.map((r, i) => (
        <List.Item
          key={`${r.server}-${r.path}-${i}`}
          title={r.name}
          subtitle={`${r.server} — ${r.path}`}
          accessories={
            r.isFolder
              ? [] // no size for folders
              : [{ text: `${r.size.toLocaleString()} bytes` }]
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Full Path" content={r.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
