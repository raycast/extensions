import { Detail } from "@raycast/api"
import HashForm from "./form/hashForm"

export default function Hash() {
  return (
    <>
      <Detail
        markdown={"Hash password"}
        navigationTitle="hash"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="hash" text={`Hash a password using bcrypt with salt`} />
          </Detail.Metadata>
        }
      />
      <HashForm />
    </>
  )
}
