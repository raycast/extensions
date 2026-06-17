import { Detail } from "@raycast/api";

export default function ErrorComponent({ errorMessage }: { errorMessage: string }) {
  return (
    <Detail
      markdown={`# ERROR
    
${errorMessage}`}
    />
  );
}
