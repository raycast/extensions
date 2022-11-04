import { CreateImage, CreateImageValues } from "./components/CreateImage";

export default function Command(props: { draftValues?: CreateImageValues }) {
  return <CreateImage draftValues={props.draftValues} />;
}
