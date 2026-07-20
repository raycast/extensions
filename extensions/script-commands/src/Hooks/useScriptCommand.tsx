import { useEffect, useRef, useState } from "react";

import { Image, ImageLike } from "@raycast/api";

import { ScriptCommand } from "@models";

import { useDataManager } from "@hooks";

import { Filter, State } from "@types";

import { iconDarkURLFor, iconLightURLFor, languageURL, sourceCodeNormalURL } from "@urls";

import { IconConstants } from "Const";

type ScriptCommandState = {
  commandState: State;
  scriptCommand: ScriptCommand;
};

interface UseScriptCommandProps {
  identifier: string;
  title: string;
  subtitle: string;
  icon: ImageLike;
  keywords: string[];
  accessoryIcon: ImageLike;
  accessoryTitle: string;
  sourceCodeURL: string;
  filter: Filter;
  state: State;
  path?: string;
}

type UseScriptCommandState = {
  props: UseScriptCommandProps;
  install: () => void;
  uninstall: () => void;
  confirmSetup: () => void;
  editSourceCode: () => void;
  setFilter: (filter: Filter) => void;
};

type UseScriptCommand = (initialScriptCommand: ScriptCommand) => UseScriptCommandState;

export const useScriptCommand: UseScriptCommand = (initialScriptCommand) => {
  const abort = useRef<AbortController | null>(null);
  const { dataManager, filter, commandIdentifier, setFilter } = useDataManager();

  const [state, setState] = useState<ScriptCommandState>({
    commandState: dataManager.stateFor(initialScriptCommand.identifier),
    scriptCommand: initialScriptCommand,
  });

  useEffect(() => {
    abort.current?.abort();
    abort.current = new AbortController();

    if (state.commandState === State.NeedSetup) {
      const identifier = state.scriptCommand.identifier;

      const monitor = dataManager.monitorChangesFor(identifier, (state) => {
        if (state === State.ChangesDetected && !abort.current?.signal.aborted) {
          setState((oldState) => ({
            ...oldState,
            commandState: state,
          }));

          monitor?.close();
        }
      });
    }

    return () => {
      abort.current?.abort();
    };
  }, [state]);

  const install = async () => {
    const result = await dataManager.installScriptCommand(state.scriptCommand);

    setState((oldState) => ({
      ...oldState,
      commandState: result.content,
    }));
  };

  const uninstall = async () => {
    const result = await dataManager.deleteScriptCommand(state.scriptCommand);

    setState((oldState) => ({
      ...oldState,
      commandState: result.content,
    }));
  };

  const confirmSetup = async () => {
    const result = await dataManager.confirmScriptCommandSetupFor(state.scriptCommand);

    setState((oldState) => ({
      ...oldState,
      commandState: result.content,
    }));
  };

  const editSourceCode = () => {
    const monitor = dataManager.updateHashOnChangeFor(state.scriptCommand.identifier, () => {
      monitor?.close();
    });
  };

  const file = dataManager.commandFileFor(state.scriptCommand.identifier);

  useEffect(() => {
    if (state.scriptCommand.identifier == commandIdentifier) {
      setState((oldState) => ({
        ...oldState,
        commandState: dataManager.stateFor(state.scriptCommand.identifier),
      }));
    }
  }, [commandIdentifier]);

  return {
    props: {
      identifier: state.scriptCommand.identifier,
      title: state.scriptCommand.title,
      subtitle: state.scriptCommand.packageName ?? "",
      icon: iconFor(state.scriptCommand),
      keywords: keywordsFor(state.scriptCommand, state.commandState),
      accessoryIcon: accessoryIconFor(state.commandState, state.scriptCommand.language),
      accessoryTitle: accessoryTitleFor(state.scriptCommand),
      sourceCodeURL: sourceCodeNormalURL(state.scriptCommand),
      filter: filter,
      state: state.commandState,
      path: file?.path,
    },
    install,
    uninstall,
    confirmSetup,
    editSourceCode,
    setFilter,
  };
};

// ###########################################################################
// ###########################################################################

type AccessoryIconFor = (state: State, language: string) => ImageLike;

const accessoryIconFor: AccessoryIconFor = (state, language) => {
  let icon: ImageLike;

  if (state === State.Installed) {
    icon = IconConstants.Installed;
  } else if (state === State.NeedSetup) {
    icon = IconConstants.NeedSetup;
  } else if (state === State.ChangesDetected) {
    icon = IconConstants.ChangesDetected;
  } else {
    icon = {
      source: languageURL(language),
    };
  }

  return icon;
};

// ###########################################################################
// ###########################################################################

type AccessoryTitleFor = (scriptCommand: ScriptCommand) => string;

const accessoryTitleFor: AccessoryTitleFor = (scriptCommand) => {
  const defaultAuthor = "Raycast";

  if (!scriptCommand.authors) {
    return defaultAuthor;
  }

  const authors = scriptCommand.authors;

  if (authors.length == 0) {
    return defaultAuthor;
  }

  let content = "";

  authors.forEach((author) => {
    if (content.length > 0) {
      content += " and ";
    }

    content += author.name;
  });

  return content;
};

// ###########################################################################
// ###########################################################################

type KeywordsIconFor = (scriptCommand: ScriptCommand, state: State) => string[];

const keywordsFor: KeywordsIconFor = (scriptCommand, state) => {
  const keywords: string[] = [];

  const packageName = scriptCommand.packageName;

  if (packageName) {
    keywords.push(packageName);
  }

  const authors = scriptCommand.authors;

  if (authors && authors.length > 0) {
    authors.forEach((author) => {
      const name = author.name;

      if (name) {
        name.split(" ").forEach((value) => keywords.push(value));
      }
    });
  }

  if (scriptCommand.language) {
    keywords.push(scriptCommand.language);
  }

  if (state === State.Installed) {
    keywords.push("installed");
  } else if (state === State.NeedSetup || state === State.ChangesDetected) {
    keywords.push("installed");
    keywords.push("setup");
  }

  if (scriptCommand.isTemplate) {
    keywords.push("template");
  }

  return keywords;
};

// ###########################################################################
// ###########################################################################

type IconFor = (scriptCommand: ScriptCommand) => Image;

const iconFor: IconFor = (scriptCommand) => {
  const iconDark = iconDarkURLFor(scriptCommand);
  const iconLight = iconLightURLFor(scriptCommand);

  const image: Image = {
    source: {
      light: iconLight != null ? iconLight.content : "",
      dark: iconDark != null ? iconDark.content : "",
    },
  };

  return image;
};
