import * as mongoose from "mongoose";

export default new mongoose.Schema(
  {
    any: mongoose.Schema.Types.Mixed,
  },
  { versionKey: false }
);
