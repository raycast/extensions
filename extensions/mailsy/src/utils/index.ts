import axios from "axios";
import { LocalStorage } from "@raycast/api";
import { Clipboard, showHUD, closeMainWindow } from "@raycast/api";

const clearLocalStorage = async () => {
  const account = {
    email: "",
    password: "",
    token: "",
    id: "",
  };

  await LocalStorage.setItem("account", JSON.stringify(account));
};

export const createAccount = async () => {
  const storage = await LocalStorage.allItems();

  // parse storage
  const account = JSON.parse(storage.account);

  if (account.email) {
    showHUD("Account Already Created");
    return;
  }

  // get the available email domains
  const { data } = await axios.get("https://api.mail.tm/domains?page=1");

  // get the first domain
  const domain = data["hydra:member"][0].domain;

  // generate a random email address
  const email = `${Math.random().toString(36).substring(7)}@${domain}`;

  // generate a random password
  const password = Math.random().toString(36).substring(7);

  try {
    const { data } = await axios.post("https://api.mail.tm/accounts", {
      address: email,
      password,
    });

    // add password to the data object
    data.password = password;

    // get Jwt token
    const { data: token } = await axios.post("https://api.mail.tm/token", {
      address: email,
      password,
    });

    const account = {
      email,
      password,
      token: token.token,
      id: data.id,
    };

    // save the account details to local storage
    await LocalStorage.setItem("account", JSON.stringify(account));

    // save email to clipboard
    await Clipboard.copy(email);

    // show a HUD message
    await showHUD(`Account created successfully. Email copied to clipboard.`);
  } catch (error) {
    return "Error creating account";
  }
};
export const fetchMessages = async () => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  if (!account.email) {
    return false;
  }

  try {
    const { data } = await axios.get("https://api.mail.tm/messages", {
      headers: {
        Authorization: `Bearer ${account.token}`,
      },
    });

    const email = data["hydra:member"];

    return email;
  } catch (error) {
    console.log(error);
  }
};
export const deleteAccount = async () => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  if (!account.email) {
    showHUD("Account not created");
    return;
  }

  try {
    await axios.delete(`https://api.mail.tm/accounts/${account.id}`, {
      headers: {
        Authorization: `Bearer ${account.token}`,
      },
    });

    await clearLocalStorage();

    showHUD("Account deleted successfully");
  } catch (error) {
    console.log(error);
  }
};
export const ShowInfo = async () => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  if (!account.email) {
    return false;
  }
  try {
    // get the account details
    const { data } = await axios.get(`https://api.mail.tm/accounts/${account.id}`, {
      headers: {
        Authorization: `Bearer ${account.token}`,
      },
    });

    return data;
  } catch (error) {}
};

export const openEmail = async (id: string) => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  if (!account.email) {
    return false;
  }

  try {
    // get the account details
    const { data } = await axios.get(`https://api.mail.tm/messages/${id}`, {
      headers: {
        Authorization: `Bearer ${account.token}`,
      },
    });

    return data;
  } catch (error) {
    console.log(error);
  }
};
