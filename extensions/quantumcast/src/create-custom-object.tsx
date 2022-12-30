import * as mongoose from "mongoose";
import { showToast, Toast, open } from "@raycast/api";
import { mongoDB, mongoURL } from "./assets/preferences";
import customobjectSchema from "./schemas/customobject";
import { CustomCollection } from "./types";
import { cloudflowCollectionsUrl } from "./assets/globals";
//import open from "open";

export default async function Command(props: { arguments: CustomCollection }) {
  const { collectionName } = props.arguments;
  await mongoose.connect(`${mongoURL}/${mongoDB}`);

  // Create dynamic model. The 3dr argument looks like a duplication but it prevents automatic pluralization of the collection name!
  const CustomObject = mongoose.model(
    `customobjects.${collectionName}`,
    customobjectSchema,
    `customobjects.${collectionName}`
  );

  // CustomObject.createCollection()
  CustomObject.create({});

  const options: Toast.Options = {
    style: Toast.Style.Success,
    title: "Cloudflow database",
    message: "Custom object succesfully created!",
    primaryAction: {
      title: "Open custom object in browser",
      onAction: (toast) => {
        open(`${cloudflowCollectionsUrl}customobjects.${encodeURIComponent(collectionName)}`);
        toast.hide();
      },
    },
  };
  await showToast(options);
}
