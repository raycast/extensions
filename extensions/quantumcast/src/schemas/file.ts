import * as mongoose from "mongoose";

const filesSchema = new mongoose.Schema({
  cloudflow: {
    file: String,
    enclosing_folder: String,
  },
  document_name: String,
  path: [String],
  filetype: String,
  file_name: String,
  file_extension: String,
  url: String,
});

export default mongoose.model("Files", filesSchema);
