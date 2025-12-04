import { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { baseURL } from "./Constants";
import useParser from "./hooks/useParser";
import CodeView from "./components/CodeView";

interface LaunchPropsType {
  slug: string;
}

export default function GetCommand(props: LaunchProps<{ arguments: LaunchPropsType }>) {
  const { slug } = props.arguments;
  const { data, isLoading } = useFetch<{ code: string }>(`${baseURL}/code_get.php?slug=${slug}`);

  const parsedData = useParser(data?.code || "");

  return <CodeView code={{ code: data?.code || "", parsedCode: parsedData }} slug={slug} isLoading={isLoading} />;
}
