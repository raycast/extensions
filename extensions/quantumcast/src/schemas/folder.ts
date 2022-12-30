import * as mongoose from "mongoose";

const folderSchema = new mongoose.Schema({
  cloudflow: {
    folder: String,
    enclosing_folder: String,
  },
  path: [String],
  depth: Number,
  name: String,
});

export default mongoose.model("Folders", folderSchema);
