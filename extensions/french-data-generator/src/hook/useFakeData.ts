import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { useRandomAddress } from "./useRandomAdress";
import { generateRandomDOB, generateRandomSSN, getRandomBankDetails, getRandomName } from "../Utils/random";
import { BankDetails, FakeDataState, PersonName } from "../types/types";

export function useFakeData() {
  const [fakeData, setFakeData] = useState<FakeDataState>({
    dob: null,
    name: null,
    ssn: null,
    bankDetails: null,
    address: null,
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { address: fetchedAddress, isLoading, revalidate } = useRandomAddress();

  useEffect(() => {
    const loadData = async () => {
      const savedDob = await LocalStorage.getItem<string>("dob");
      const savedName = await LocalStorage.getItem<string>("name");
      const savedSSN = await LocalStorage.getItem<string>("ssn");
      const savedBankDetails = await LocalStorage.getItem<string>("bankDetails");
      const savedAddress = await LocalStorage.getItem<string>("address");

      if (savedDob && savedName && savedSSN && savedBankDetails && savedAddress) {
        setFakeData({
          dob: savedDob,
          name: JSON.parse(savedName) as PersonName,
          ssn: savedSSN,
          bankDetails: JSON.parse(savedBankDetails) as BankDetails,
          address: savedAddress,
        });
      } else {
        await regenerateData();
      }
      setIsInitialized(true);
    };

    if (!isInitialized) {
      loadData();
    }
  }, [isInitialized]);

  useEffect(() => {
    if (fakeData.address === "Non générée" && fetchedAddress) {
      const updatedData = { ...fakeData, address: fetchedAddress };
      setFakeData(updatedData);
      saveData(updatedData);
    }
  }, [fetchedAddress]);

  const saveData = async (data: FakeDataState) => {
    const { dob, name, ssn, bankDetails, address } = data;
    if (!dob || !name || !ssn || !bankDetails || !address) return;

    await LocalStorage.setItem("dob", dob);
    await LocalStorage.setItem("name", JSON.stringify(name));
    await LocalStorage.setItem("ssn", ssn);
    await LocalStorage.setItem("bankDetails", JSON.stringify(bankDetails));
    await LocalStorage.setItem("address", address);
  };

  const regenerateData = async () => {
    const newName = getRandomName();
    const newDob = generateRandomDOB(false);
    const newSSN = generateRandomSSN(undefined, newName.gender, false);
    const newBankDetails = getRandomBankDetails();

    const newData = {
      dob: newDob,
      name: newName,
      ssn: newSSN,
      bankDetails: newBankDetails,
      address: "Non générée", // Address will be fetched
    };

    setFakeData(newData);
    await saveData(newData);
    if (!newData.address) await revalidate(); // Fetch new address if not set
  };

  return { fakeData, isLoading, regenerateData, setFakeData, saveData, revalidate };
}
