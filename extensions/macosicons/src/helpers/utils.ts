import { Application } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { exec } from "child_process";
import fuzzysort from "fuzzysort";
import { promisify } from "node:util";
import React, { useEffect, useState } from "react";

export const execPromise = promisify(exec);

async function getModifiableApplications() {
  try {
    const { stdout } = await execPromise(
      `mdfind -onlyin /Applications -onlyin ~/Applications 'kMDItemContentType == "com.apple.application-bundle" && kMDItemAppStoreIsAppleSigned != 1' -attr kMDItemFSName -attr kMDItemCFBundleIdentifier`,
    );

    return stdout
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.split("  ");

        const name = parts[1]?.split("=")[1].replace(".app", "").trim();
        const bundleId = parts[2]?.split("=")[1].trim();
        const path = parts[0];
        return {
          path,
          name,
          bundleId,
        } as Application;
      });
  } catch (error) {
    showFailureToast(error, {
      title: "Could not load applications from spotlight",
    });
    return [];
  }
}

export function useModifiableApplications(search?: string) {
  return useCachedPromise(
    async (search) => {
      const apps = await getModifiableApplications();

      if (!search) return apps;

      const results = fuzzysort.go(search, apps, {
        key: "name",
      });
      const objects = results.map((r) => r.obj);

      const otherApplications = (apps || []).filter(
        (app) => !objects.includes(app),
      );

      return [...objects, ...otherApplications];
    },
    [search],
    { keepPreviousData: true },
  );
}

// if `turbo = true` then function doesn't debounce empty value and executes instantly
export function useDebounce<T>(
  initialValue: T,
  delay?: number,
  turbo = true,
): {
  debouncedValue: T;
  rawValue: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
} {
  const [rawValue, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(rawValue);

  useEffect(() => {
    if (turbo && !rawValue) {
      setDebouncedValue(rawValue);
      return;
    }

    const timer = setTimeout(() => setDebouncedValue(rawValue), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [rawValue, delay]);

  return { debouncedValue, rawValue, setValue };
}
