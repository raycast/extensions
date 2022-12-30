import * as mongoose from "mongoose";

const whitepaperSchema = new mongoose.Schema({
  name: String,
  system: Boolean,
});

export default mongoose.model("Whitepapers", whitepaperSchema);
