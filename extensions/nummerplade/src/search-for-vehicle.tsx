import { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import ErrorDetail from "./componenets/error";
import { VehicleSearchResponse } from "./types/vehicleSearch";
import VehicleDetail from "./componenets/vehicleDetail";

export default function SearchForVehicle(props: LaunchProps<{ arguments: Arguments.SearchForVehicle }>) {
  const { licensePlate } = props.arguments;
  const isVin = licensePlate.length > 10;

  const { isLoading, data, error } = useFetch(
    isVin
      ? ENDPOINTS.SEARCH_VEHICLE_BY_VIN.replace(":vin", licensePlate)
      : ENDPOINTS.SEARCH_VEHICLE_BY_LICENSE_PLATE.replace(":registration", licensePlate),
    {
      headers: HEADERS,
      mapResult(result: VehicleSearchResponse) {
        return {
          data: result,
        };
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return error ? <ErrorDetail error={error} /> : !isLoading && <VehicleDetail vehicle={data.data} />;
}
