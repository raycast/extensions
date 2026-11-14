export const pickBookDownloadDirectory = async (
  runScript: (script: string) => Promise<string>,
): Promise<string | undefined> => {
  const directory = await runScript(`
    try
      set outputFolder to choose folder with prompt "Please select an output folder:"
      return POSIX path of outputFolder
    on error number -128
      return ""
    end try
  `);
  return directory.trim() || undefined;
};
