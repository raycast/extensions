import fetch from "node-fetch";
import { Flight } from "./responseTypes";
import { getAPIKey } from "./utils";
import { APIError, DateError, FlightNumberError, HttpStatusCode } from "./customErrors";

export type relativeDate = "yesterday" | "today" | "tomorrow" | "dayAfterTomorrow";

/**
 * Class that allows to track flights given their number in format "AB123" and the flight date
 */
export default class FlightTrack {
  private flightNumber: string;
  private flightDate: Date;
  public response?: Flight;

  /**
   *
   * @param {string}flightNumber The flight number we want to track "AB123"
   * @param {Date}flightDate The date of the flight are tracking
   */
  constructor(flightNumber: string, flightDate: Date) {
    if (!this.isValidFlightNumber(flightNumber)) {
      throw new FlightNumberError("Invalid flight number format");
    }
    this.flightNumber = flightNumber;
    this.flightDate = flightDate;
  }

  /**
   * Checks if the flightr number string is given in the correct format
   * @param {string}flightNumber In the form of "AB123"
   * @returns {boolean} Whether the flight number inserted is correct or not
   */
  public isValidFlightNumber(flightNumber: string): boolean {
    // Regular expression to verify that the flight number has the correct format (e.g. UAL525)
    const flightNumberRegex = /^[A-Z]{2,3}\d{1,4}$/;
    return flightNumberRegex.test(flightNumber);
  }

  /**
   * Changes the flight date relative to the current day
   * @param {string}date The date relative to today, to which we want to change the flight.
   */
  public setFlightDate(date: relativeDate): void {
    const currentDate = new Date();
    let newDate: Date;
    switch (date) {
      case "yesterday":
        newDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "today":
        newDate = currentDate;
        break;
      case "tomorrow":
        newDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "dayAfterTomorrow":
        newDate = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new DateError("Invalid date specified");
    }
    this.flightDate = newDate;
  }

  /**
   * Function that makes a http request to the AeroDataBox Api and returns the response
   * @returns {Promise<Flight[]>} The response of the http request.
   */
  public async getFlight(): Promise<Flight[]> {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${this.flightNumber}/${
      this.flightDate.toISOString().split("T")[0]
    }?withAircraftImage=false&withLocation=false`;
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": getAPIKey(),
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    };

    try {
      const response = await fetch(url, options);
      if (response.status === HttpStatusCode.OK) {
        const flightData = await response.json();
        return flightData as Flight[];
      } else if (response.status === HttpStatusCode.EMPTY_RESPONSE) {
        throw new APIError({
          name: "Empty Response",
          httpCode: HttpStatusCode.BAD_REQUEST,
          description: "The API response came back empty - this is probably due to an inexistent flight.",
        });
      } else if (response.status === HttpStatusCode.BAD_REQUEST) {
        const respMessage: { message: string } = <{ message: string }>await response.json();
        throw new APIError({
          name: "Empty Response",
          httpCode: HttpStatusCode.BAD_REQUEST,
          description: respMessage.message,
        });
      } else if (response.status === HttpStatusCode.UNAUTHORIZED) {
        throw new APIError({
          name: "User Unauthorized - Suscribe to the API!",
          httpCode: HttpStatusCode.UNAUTHORIZED,
          description: "unauthorized",
        });
      } else if (response.status === HttpStatusCode.INTERNAL_SERVER) {
        throw new APIError({ name: "Server Error" });
      } else if (response.status === HttpStatusCode.NOT_FOUND) {
        throw new APIError({ name: "Server Not Found" });
      } else {
        throw new APIError({ name: "Unknown", isOperational: false });
      }
    } catch (err) {
      throw new APIError({ name: `Error getting flight information: ${err}` });
    }
  }
}
