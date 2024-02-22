import { Account, Jar } from "../../types";

export function isAccount(accountOrJar: Account | Jar): accountOrJar is Account {
  return (accountOrJar as Account).iban !== undefined;
}

export function isJar(accountOrJar: Account | Jar): accountOrJar is Jar {
  return (accountOrJar as Jar).goal !== undefined;
}
