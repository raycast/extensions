import { Color, Icon, List } from "@raycast/api";
import { useMailerSendPaginated } from "./mailersend";
import { Token, TokenScopeType } from "./interfaces";
import dayjs from "dayjs";

export default function Tokens() {
  const { isLoading, data: tokens } = useMailerSendPaginated<Token>("token");

  function generateSubtitle(token: Token) {
    const {scopes} = token;
    let scopeText = "Custom access";
    if (scopes.length===1 && scopes[0]===TokenScopeType.EMAIL_FULL) scopeText="Sending access";
    else {
      const fullScopes = Object.values(TokenScopeType).filter(scope => scope.includes("_full"));
      if (fullScopes.every(scope => scopes.includes(scope))) scopeText = "Full access";
    }

    const dateText = dayjs(token.created_at).format("YYYY-MM-DD");
    return `${scopeText} ・ ${dateText}`;
  }

  return (
    <List isLoading={isLoading}>
      {tokens.map(token => <List.Item key={token.id} icon={token.status==="unpause" ? { value: {source: Icon.Dot, tintColor: Color.Green }, tooltip: "Active" } : {value: {source: Icon.Dot, tintColor: Color.Red}, tooltip: "Inactive"}} title={token.name} subtitle={generateSubtitle(token)} accessories={[
        {icon: Icon.Globe, text: token.domain?.name ?? "All"}
      ]} />)}
    </List>
  );
}
