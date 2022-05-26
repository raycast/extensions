import { FC } from "react"
import EntryLocation, { EntryLocationRaw } from "../models/entry-location"
import { Form } from "@raycast/api"
import Sugar from "sugar"

type EntryLocationFormFieldsProps = {
  identifier: "source" | "destination"
  location: EntryLocation
  sshEnabled: boolean
  onChange: (location: EntryLocation) => void
}

const EntryLocationFormFields: FC<EntryLocationFormFieldsProps> = ({ identifier, location, sshEnabled, onChange }) => {
  const formFieldChange = (propPath: string, value: string) => {
    if (Sugar.Object.get<string>(location, propPath) === value) return
    let clone = location.toRawData()
    clone = Sugar.Object.set(clone, propPath, value) as EntryLocationRaw
    onChange(new EntryLocation(clone))
  }

  return (
    <>
      <Form.TextField
        id={`${identifier}Path`}
        title={sshEnabled ? "Remote Path*" : "Path*"}
        placeholder={"/path/to/source/file/or/folder"}
        defaultValue={location.path}
        onChange={value => formFieldChange("path", value)}
      />

      {sshEnabled && (
        <>
          <Form.TextField
            id={`${identifier}Username`}
            title="Username"
            info="Remote machine username."
            placeholder="admin"
            defaultValue={location.userName}
            onChange={value => formFieldChange("userName", value)}
          />
          <Form.TextField
            id={`${identifier}Hostname`}
            title="Hostname"
            info="Remote machine hostname."
            placeholder="site.dev"
            defaultValue={location.hostName}
            onChange={value => formFieldChange("hostName", value)}
          />
          <Form.TextField
            id={`${identifier}Port`}
            placeholder="22"
            info="Remote machine SSH port."
            title="Port"
            defaultValue={location.port}
            onChange={value => formFieldChange("port", value)}
          />
          <Form.TextField
            id={`${identifier}IdentityFile`}
            info="SSH private key file path, will use the default key if not specified."
            title="Identity File"
            defaultValue={location.identityFile}
            onChange={value => formFieldChange("identityFile", value)}
          />
        </>
      )}
    </>
  )
}

export default EntryLocationFormFields
