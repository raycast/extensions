import { CardList } from "./components/CardList";
import { WithLogins } from "./components/WithLogins";

export default function ViewCards() {
  return <WithLogins>{(logins, reload) => <CardList logins={logins} onLoginsChanged={reload} />}</WithLogins>;
}
