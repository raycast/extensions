import ErrorComponent from "./ErrorComponent";

export default function InvalidUrlComponent() {
  const error = new Error("Invalid URL - make sure the DirectAdmin URL is valid");
  return <ErrorComponent errorResponse={error} />;
}
