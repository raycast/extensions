import * as mongoose from "mongoose";

const marsAppSchema = new mongoose.Schema({
  name: String,
  version: String,
  description: String,
  you_are_owner: Boolean,
  owner: String,
  documentation: String,
  landingPage: String,
  icon: String,
  minCloudflowVersion: String,
  environments: [
    {
      type: String,
    },
  ],
});

export default mongoose.model("registry.cfapp", marsAppSchema, "registry.cfapp");
