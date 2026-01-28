import type { ModuleDoc } from "../types";

export const File_Stat: ModuleDoc = {
  functions: [
    {
      name: "to_record/1",
      type: "function",
      specs: ["@spec to_record(t()) :: :file.file_info()"],
      documentation:
        "Converts a `File.Stat` struct to a `:file_info` record.\n",
    },
    {
      name: "from_record/1",
      type: "function",
      specs: ["@spec from_record(:file.file_info()) :: t()"],
      documentation: "Converts a `:file_info` record into a `File.Stat`.\n",
    },
  ],
  name: "File.Stat",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %File.Stat{\n        access: :read | :write | :read_write | :none | :undefined,\n        atime: :calendar.datetime() | integer() | :undefined,\n        ctime: :calendar.datetime() | integer() | :undefined,\n        gid: non_neg_integer() | :undefined,\n        inode: non_neg_integer() | :undefined,\n        links: non_neg_integer() | :undefined,\n        major_device: non_neg_integer() | :undefined,\n        minor_device: non_neg_integer() | :undefined,\n        mode: non_neg_integer() | :undefined,\n        mtime: :calendar.datetime() | integer() | :undefined,\n        size: non_neg_integer() | :undefined,\n        type: :device | :directory | :regular | :other | :symlink | :undefined,\n        uid: non_neg_integer() | :undefined\n      }",
      ],
      documentation: null,
    },
  ],
};
