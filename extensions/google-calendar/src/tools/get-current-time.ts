/**
 * Get the current time
 *
 * @remarks
 * Use this tool only if you need to get the current time.
 */
const tool = async () => {
  const now = new Date();
  return {
    time: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

export default tool;
