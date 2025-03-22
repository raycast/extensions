import { LocalStorage } from "@raycast/api";
import octokit, { githubAPIToken } from "./octokit";

export const getLogin = () =>
  Promise.resolve()
    .then(() => console.debug("getLogin"))
    .then(() => LocalStorage.getItem("githubAPITokenLastValue"))
    .then(res => (res as string | undefined) || "")
    .then(token => {
      if (token && token === githubAPIToken) {
        return LocalStorage.getItem("githubLogin")
          .then(login => login as string)
          .then(login => {
            console.debug(`getLogin: resolve=localStorage login=${login}`);

            return login;
          });
      }

      return Promise.resolve()
        .then(() => console.debug(`getLogin: resolve=octokit`))
        .then(() => octokit.request("GET /user"))
        .then(res => res.data.login)
        .then(login =>
          Promise.all([
            LocalStorage.setItem("githubLogin", login),
            LocalStorage.setItem("githubAPITokenLastValue", githubAPIToken),
          ]).then(() => login)
        )
        .then(login => {
          console.debug(`getLogin: resolve=octokit login=${login}`);

          return login;
        });
    });
