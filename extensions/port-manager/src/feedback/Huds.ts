const Huds = {
  KillProcess: {
    Error(process: { name?: string; port: string }) {
      return `⚠️ Failed to kill process ${process.name ?? "Untitled Process"} (${process.port})`;
    },

    Success(process: { name?: string; port: string }) {
      return `✅ Successfully killed ${process.name ?? "Untitled Process"} (${process.port})`;
    },
  },
} as const;

export default Huds;
