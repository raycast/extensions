import * as mongoose from "mongoose";

const filestoreSchema = new mongoose.Schema({
  name: String,
  mapping: String,
});

export default mongoose.model("Filestores", filestoreSchema);
