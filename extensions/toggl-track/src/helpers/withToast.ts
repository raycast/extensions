import { showToast, Toast } from "@raycast/api";

export async function withToast({ verb, noun, message, action }: WithToastOptions) {
  const verbTenses: VerbOptions = typeof verb === "object" ? verb : { presentTense: verb };
  const toast = await showToast({
    title: `${verbTenses.progressiveTense ?? verbTenses.presentTense + "ing"} ${noun}`,
    style: Toast.Style.Animated,
    message,
  });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = `${noun} ${verbTenses.pastTense ?? verbTenses.presentTense + "ed"}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't ${verbTenses.presentTense} ${noun}`;
    if (error instanceof Error) toast.message = error.message;
  }
}

interface WithToastOptions {
  verb: Capitalize<string> | VerbOptions;
  noun: Capitalize<string>;
  message?: string;
  action: () => Promise<void> | void;
}

interface VerbOptions {
  presentTense: Capitalize<string>;
  progressiveTense?: Capitalize<string>;
  pastTense?: Capitalize<string>;
}

export const Verb = {
  Create: {
    presentTense: "Create",
    progressiveTense: "Creating",
    pastTense: "Created",
  },
  Delete: {
    presentTense: "Delete",
    progressiveTense: "Deleting",
    pastTense: "Deleted",
  },
  Rename: {
    presentTense: "Rename",
    progressiveTense: "Renaming",
    pastTense: "Renamed",
  },
  Edit: {
    presentTense: "Edit",
  },
  Archive: {
    presentTense: "Archive",
    progressiveTense: "Archiving",
    pastTense: "Archived",
  },
  Restore: {
    presentTense: "Restore",
    progressiveTense: "Restoring",
    pastTense: "Restored",
  },
} as const satisfies Record<string, VerbOptions>;
