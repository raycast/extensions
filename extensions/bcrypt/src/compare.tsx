import { Detail } from "@raycast/api"
import CompareForm from "./form/compareForm"

export default function Compare() {
  return (
    <>
      <Detail
        markdown={"Compare password"}
        navigationTitle="compare"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="compare" text={`Compare a password with a hashed password using bcrypt`} />
          </Detail.Metadata>
        }
      />
      <CompareForm />
    </>
  )
}
