import { Shortcuts } from "../model/internal/internal-models";
import { ShortcutsParser } from "./input-parser";
import Validator from "./validator";
import { AllApps } from "../model/input/input-models";
import useKeyCodes from "./key-codes-provider";
import fetch from "cross-fetch";
import { useEffect, useState } from "react";
import { useRefreshableCachedState } from "./use-refreshable-cached-state";

const cacheKey = "shortcuts";

interface Properties {
  execute: boolean;
}

interface UseAllShortcutsResult {
  isLoading: boolean;
  data: Shortcuts;
}

const emptyShortcuts: Shortcuts = {
  applications: [],
};
export default function useAllShortcuts(props?: Properties): UseAllShortcutsResult {
  if (props && !props.execute) {
    return {
      isLoading: false,
      data: emptyShortcuts,
    };
  }

  const keyCodesResult = useKeyCodes();
  const [alreadyUpdated, setAlreadyUpdated] = useState(true);
  const refreshableCachedState = useRefreshableCachedState<Shortcuts | undefined, Shortcuts>(
    cacheKey,
    async () => {
      if (!keyCodesResult.data) return undefined;
      console.log("Fetching shortcuts");
      const res = await fetch("https://shortcuts.solomk.in/data/combined-apps.json");
      const json: AllApps = await res.json();
      const updatedShortcuts = new ShortcutsProvider(
        json,
        new ShortcutsParser(),
        new Validator(keyCodesResult.data)
      ).getShortcuts();
      return updatedShortcuts;
    },
    {
      dataParser: (v) => {
        return v ? v : emptyShortcuts;
      },
      execute: !keyCodesResult.data,
    }
  );

  useEffect(() => {
    if (!keyCodesResult.isLoading && refreshableCachedState.data.applications.length === 0 && alreadyUpdated) {
      setAlreadyUpdated(false);
      refreshableCachedState.revalidate();
    }
  }, [keyCodesResult, refreshableCachedState]);

  return refreshableCachedState;
}

class ShortcutsProvider {
  constructor(
    private readonly allApps: AllApps,
    private readonly parser: ShortcutsParser,
    private readonly validator: Validator
  ) {}

  public getShortcuts(): Shortcuts {
    this.validator.validate(this.allApps.list);
    return {
      applications: this.parser.parseInputShortcuts(this.allApps.list),
    };
  }
}
