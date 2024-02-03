import { Container } from "./container";

export default function Command() {
  return <Container recipe="From_Base64('A-Za-z0-9+/=',true,false)" />;
}
