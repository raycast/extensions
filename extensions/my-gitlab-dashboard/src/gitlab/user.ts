import { checkStatusCode, graphQlEndpoint, headers } from "./common";
import { myUsername as myUsernameFromStorage } from "../storage";
import fetch from "node-fetch";

export interface User {
  name: string;
  username: string;
  isMe: boolean;
  teamUsername: string;
}

const CURRENT_USER_QUERY = `
query CurrentUser {
    currentUser {
        username
    }
}
`;

export function myUsername(): Promise<string> {
  return fetch(graphQlEndpoint, {
    headers,
    method: "post",
    body: JSON.stringify({
      query: CURRENT_USER_QUERY,
    }),
  })
    .then(checkStatusCode)
    .then((res) => res.json())
    .then((data) => data.data.currentUser.username);
}

export async function enrichUser(u: User) {
  const myUsername = await myUsernameFromStorage();
  u.isMe = u.username === myUsername;
  u.teamUsername = teamUsername(u, myUsername);
}

function teamUsername(u: User, myUsername: string): string {
  function getFirstName(fullname: string): string {
    const [firstName] = fullname.split(" ");
    return firstName;
  }
  return u.username === myUsername ? "me" : getFirstName(u.name);
}
