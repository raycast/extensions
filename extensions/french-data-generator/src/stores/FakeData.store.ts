import { BehaviorSubject } from "rxjs";
import { FakeDataState } from "../types/fakeData";
import { BaseModule } from "./BaseModule.store";
import { LocalStorage } from "@raycast/api";
import {
  generateRandomDob,
  getRandomName,
  generateRandomSSN,
  getRandomBankDetails,
  fetchRandomAddress,
  getRandomSearchQuery,
} from "../utils";

export class FakeDataModule extends BaseModule {
  constructor() {
    super();
    this.loadFromLocalStorage(); // Load data from LocalStorage on initialization
  }

  private readonly fakeDataSubject = new BehaviorSubject<FakeDataState>({
    dob: null,
    name: null,
    ssn: null,
    bankDetails: null,
    address: null,
  });

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly addressLoadingSubject = new BehaviorSubject<boolean>(false);

  public fakeData$ = this.fakeDataSubject.asObservable();
  public isLoading$ = this.loadingSubject.asObservable();
  public isAddressLoading$ = this.addressLoadingSubject.asObservable();

  // Load data from LocalStorage
  private async loadFromLocalStorage() {
    try {
      const dob = (await LocalStorage.getItem<string>("dob")) || null;
      const name = JSON.parse((await LocalStorage.getItem<string>("name")) || "null");
      const ssn = (await LocalStorage.getItem<string>("ssn")) || null;
      const bankDetails = JSON.parse((await LocalStorage.getItem<string>("bankDetails")) || "null");
      const address = (await LocalStorage.getItem<string>("address")) || null;

      this.fakeDataSubject.next({ dob, name, ssn, bankDetails, address });
    } catch (error) {
      console.error("[FakeDataModule] Error loading from LocalStorage:", error);
    }
  }

  // Save data to LocalStorage
  private async saveToLocalStorage(data: FakeDataState) {
    try {
      await LocalStorage.setItem("dob", data.dob || "");
      await LocalStorage.setItem("name", JSON.stringify(data.name || {}));
      await LocalStorage.setItem("ssn", data.ssn || "");
      await LocalStorage.setItem("bankDetails", JSON.stringify(data.bankDetails || {}));
      await LocalStorage.setItem("address", data.address || "");
    } catch (error) {
      console.error("[FakeDataModule] Error saving to LocalStorage:", error);
    }
  }

  // Regenerate data with optional overrides
  public async regenerateData(overrides?: Partial<FakeDataState>): Promise<void> {
    this.loadingSubject.next(true);

    try {
      const currentData = this.fakeDataSubject.getValue();
      // const newDob = overrides?.dob || currentData?.dob || generateRandomDOB(false); // Use overrides if provided
      const newDob = overrides?.dob || currentData?.dob || generateRandomDob(18, 99); // Use overrides if provided
      const isMinor = newDob ? new Date().getFullYear() - parseInt(newDob.split("/")[2], 10) < 18 : false;
      const newName = getRandomName();
      const newSSN = generateRandomSSN(newDob, newName.gender, isMinor);
      const newBankDetails = getRandomBankDetails();

      const updatedData: FakeDataState = {
        dob: newDob,
        name: newName,
        ssn: newSSN,
        bankDetails: newBankDetails,
        address: "Non générée", // Force regeneration of the address
        ...overrides,
      };

      this.fakeDataSubject.next(updatedData);
      await this.saveToLocalStorage(updatedData); // Save changes to LocalStorage

      // Fetch a new address if necessary
      await this.fetchAddress();
    } catch (error) {
      console.error("[FakeDataModule] Error during data regeneration:", error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // Update partial data
  public async updateFakeData(newData: Partial<FakeDataState>): Promise<void> {
    const currentData = this.fakeDataSubject.getValue();
    const updatedData = { ...currentData, ...newData };
    this.fakeDataSubject.next(updatedData);
    await this.saveToLocalStorage(updatedData); // Save immediately to LocalStorage
  }

  // Fetch a new random address
  public async fetchAddress(maxRetries = 10): Promise<void> {
    this.addressLoadingSubject.next(true);
    let retries = 0;
    let fetchedAddress: string | null = null;

    while (!fetchedAddress && retries < maxRetries) {
      try {
        const query = getRandomSearchQuery();

        fetchedAddress = await fetchRandomAddress(query);

        if (fetchedAddress) {
          await this.updateFakeData({ address: fetchedAddress });
        } else {
          console.warn("[FakeDataModule] No valid address found.");
        }
      } catch (error) {
        console.error("[FakeDataModule] Error fetching address:", error);
      }

      retries++;
      if (!fetchedAddress && retries < maxRetries) {
        console.log(`[FakeDataModule] Retry ${retries}...`);
      }
    }

    if (!fetchedAddress) {
      console.error(`[FakeDataModule] Failed to fetch a valid address after ${maxRetries} retries`);
      await this.updateFakeData({ address: "No valid address found after multiple attempts." });
    }

    this.addressLoadingSubject.next(false);
  }
}
