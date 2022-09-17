import axios from "axios";
import { LocalStorage, popToRoot, Clipboard, showHUD } from "@raycast/api";
import path from "path";
import fs from "fs/promises";

const checkLocalStorage = async () => {
  const storage = await LocalStorage.allItems();

  if (!storage.account) {
    return false;
  }

  return true;
};

export const createAccount = async () => {
  if (await checkLocalStorage()) {
    return showHUD("❌ Account already exists");
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
    await showHUD(`✅ Account created successfully. Email copied to clipboard.`);
  } catch (error) {
    return "Error creating account";
  }
};

export const fetchMessages = async () => {
  if (!(await checkLocalStorage())) {
    showHUD("❌ No account found. Please create one");
    return false;
  }

  const storage = await LocalStorage.allItems();

  // parse the account object
  const { token } = JSON.parse(storage.account);

  try {
    const { data } = await axios.get("https://api.mail.tm/messages", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const email = data["hydra:member"];

    return email;
  } catch (error) {
    console.log(error);
  }
};
export const deleteAccount = async () => {
  if (!(await checkLocalStorage())) {
    showHUD("❌ No account found. Please create one");
    return false;
  }

  const storage = await LocalStorage.allItems();

  const { token, id } = JSON.parse(storage.account);

  try {
    await axios.delete(`https://api.mail.tm/accounts/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await LocalStorage.clear();

    showHUD("✅ Account deleted successfully");
  } catch (error) {
    console.log(error);
  }
};
export const ShowInfo = async () => {
  if (!(await checkLocalStorage())) {
    showHUD("❌ No account found. Please create one");
    return false;
  }

  const storage = await LocalStorage.allItems();

  const { token, id } = JSON.parse(storage.account);

  try {
    // get the account details
    const { data } = await axios.get(`https://api.mail.tm/accounts/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data;
  } catch (error) {
    console.log(error);
  }
};

export const openEmail = async (id: string) => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  const { token } = account;

  try {
    // get the account details
    const { data } = await axios.get(`https://api.mail.tm/messages/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // current directory
    const dir = path.dirname(__filename);

    //write to file
    await fs.writeFile(`${dir}/assets/email.html`, data.html[0]);

    return data;
  } catch (error) {
    console.log(error);
  }
};

export const deleteMessage = async (id: string) => {
  // get all the items from local storage
  const storage = await LocalStorage.allItems();
  // parse storage
  const account = JSON.parse(storage.account);

  const { token } = account;

  try {
    await axios.delete(`https://api.mail.tm/messages/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    showHUD("✅ Message deleted successfully");
    popToRoot();
  } catch (error) {
    console.log(error);
  }
};
