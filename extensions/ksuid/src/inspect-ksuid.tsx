import { Detail, Form, LaunchProps } from "@raycast/api";
import KSUID from "ksuid";

export default function InspectCommand(props: LaunchProps<{ arguments: Arguments.InspectKsuid }>) {
  console.log(JSON.stringify(props));
  let info: KSUID | undefined;
  try {
    info = KSUID.parse(props.arguments.ksuid);
  } catch (e) {
    // ingore
  }

  return info ? (
    <Form>
      <Form.TextField id="string" title="String" value={info.string} />
      <Form.TextField id="raw" title="Raw" value={info.raw.toString("hex").toUpperCase()} />
      <Form.DatePicker id="time" title="Time" value={info.date} />
      <Form.TextField id="timestamp" title="Timestamp" value={`${info.timestamp}`} />
      <Form.TextField id="payload" title="Payload" value={info.payload.toString("hex").toUpperCase()} />
    </Form>
  ) : (
    <Detail
      markdown={`# Unable to parse input 
    
    ${props.arguments.ksuid}
    
      `}
    />
  );
}
