import dedent from "dedent-js";
import prettyBytes from "pretty-bytes";
import type { Torrent } from "../types";
import { formatDate } from "./date";
import { renderPieces } from "./renderCells";

const NL = "  \n";

export const renderDetails = async (torrent: Torrent, downloadStats: string) => {
  const img = await renderPieces({ pieces: torrent.pieces, complete: torrent.percentDone === 1 });

  return dedent(`
    ## Torrent Information

    **Pieces**: ${torrent.pieceCount}, ${prettyBytes(torrent.pieceSize)}
    **Hash**: ${torrent.hashString}  
    **Private**: ${torrent.isPrivate ? "Yes" : "No"}
    **Creator**: ${torrent.creator}
    **Created On**: ${formatDate(torrent.dateCreated)}
    **Download dir**: ${torrent.downloadDir}
    **Comment**: ${torrent.comment}

    ## Transfer

    <img src="data:image/svg+xml,${encodeURIComponent(img)}" />

    ${torrent.errorString && `**Error**: ${torrent.errorString}`}

    ${downloadStats}

    ## Files

    ${torrent.files
      .map(
        (file) =>
          `- ${file.name} (_${((100 / file.length) * file.bytesCompleted).toFixed(2)}% - ${prettyBytes(file.length)}_)`
      )
      .join("\n")}

    ## Trackers

    ${torrent.trackers
      .reduce<Array<Torrent["trackerStats"]>>((acc, tracker) => {
        acc[tracker.tier] = (acc[tracker.tier] || []).concat(
          torrent.trackerStats.find(({ announce }) => announce === tracker.announce) as Torrent["trackerStats"][0]
        );
        return acc;
      }, [])
      .map((trackers) => {
        return [
          `### Tier ${trackers[0].tier + 1}`,

          ...trackers.map((tracker) =>
            dedent(`
                - **${tracker.host}**
                  Last Announce: ${formatDate(tracker.lastAnnounceTime)}
                  Last Scape: ${formatDate(tracker.lastScrapeTime)}
                  Seeders: ${tracker.seederCount}
                  Leechers: ${tracker.leecherCount}
                  Downloaded: ${tracker.downloadCount}
              `)
          ),
        ].join("\n");
      })
      .join("\n")}
  `)
    .split("\n")
    .join(NL);
};
