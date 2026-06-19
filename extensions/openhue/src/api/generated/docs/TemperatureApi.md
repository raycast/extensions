# TemperatureApi

All URIs are relative to *https://192.168.1.0*

| Method                                                       | HTTP request                                          | Description                        |
| ------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------- |
| [**getTemperature**](TemperatureApi.md#gettemperature)       | **GET** /clip/v2/resource/temperature/{temperatureId} | Get temperature sensor information |
| [**getTemperatures**](TemperatureApi.md#gettemperatures)     | **GET** /clip/v2/resource/temperature                 | List temperatures                  |
| [**updateTemperature**](TemperatureApi.md#updatetemperature) | **PUT** /clip/v2/resource/temperature/{temperatureId} | Update temperature sensor          |

## getTemperature

> GetTemperatures200Response getTemperature(temperatureId)

Get temperature sensor information

Get details of a single temperature sensor from its given &#x60;{temperatureId}&#x60;.

### Example

```ts
import { Configuration, TemperatureApi } from "@openhue/client";
import type { GetTemperatureRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new TemperatureApi(config);

  const body = {
    // string | ID of the temperature sensor
    temperatureId: temperatureId_example,
  } satisfies GetTemperatureRequest;

  try {
    const data = await api.getTemperature(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name              | Type     | Description                  | Notes                     |
| ----------------- | -------- | ---------------------------- | ------------------------- |
| **temperatureId** | `string` | ID of the temperature sensor | [Defaults to `undefined`] |

### Return type

[**GetTemperatures200Response**](GetTemperatures200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Temperature Success Response | -                |
| **401**     | Unauthorized                 | -                |
| **403**     | Forbidden                    | -                |
| **404**     | Not Found                    | -                |
| **405**     | Method Not Allowed           | -                |
| **406**     | Not Acceptable               | -                |
| **409**     | Conflict                     | -                |
| **429**     | Too Many Requests            | -                |
| **500**     | Internal Server Error        | -                |
| **503**     | Service Unavailable          | -                |
| **507**     | Insufficient Storage         | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## getTemperatures

> GetTemperatures200Response getTemperatures()

List temperatures

List all temperatures

### Example

```ts
import { Configuration, TemperatureApi } from "@openhue/client";
import type { GetTemperaturesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new TemperatureApi(config);

  try {
    const data = await api.getTemperatures();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**GetTemperatures200Response**](GetTemperatures200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Temperature Success Response | -                |
| **401**     | Unauthorized                 | -                |
| **403**     | Forbidden                    | -                |
| **404**     | Not Found                    | -                |
| **405**     | Method Not Allowed           | -                |
| **406**     | Not Acceptable               | -                |
| **409**     | Conflict                     | -                |
| **429**     | Too Many Requests            | -                |
| **500**     | Internal Server Error        | -                |
| **503**     | Service Unavailable          | -                |
| **507**     | Insufficient Storage         | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## updateTemperature

> UpdateDevice200Response updateTemperature(temperatureId, temperaturePut)

Update temperature sensor

Update a temperature sensor from its given &#x60;{temperatureId}&#x60;.

### Example

```ts
import { Configuration, TemperatureApi } from "@openhue/client";
import type { UpdateTemperatureRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new TemperatureApi(config);

  const body = {
    // string | ID of the temperature sensor
    temperatureId: temperatureId_example,
    // TemperaturePut (optional)
    temperaturePut: { enabled: true },
  } satisfies UpdateTemperatureRequest;

  try {
    const data = await api.updateTemperature(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name               | Type                                | Description                  | Notes                     |
| ------------------ | ----------------------------------- | ---------------------------- | ------------------------- |
| **temperatureId**  | `string`                            | ID of the temperature sensor | [Defaults to `undefined`] |
| **temperaturePut** | [TemperaturePut](TemperaturePut.md) |                              | [Optional]                |

### Return type

[**UpdateDevice200Response**](UpdateDevice200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description           | Response headers |
| ----------- | --------------------- | ---------------- |
| **200**     | Success               | -                |
| **401**     | Unauthorized          | -                |
| **403**     | Forbidden             | -                |
| **404**     | Not Found             | -                |
| **405**     | Method Not Allowed    | -                |
| **406**     | Not Acceptable        | -                |
| **409**     | Conflict              | -                |
| **429**     | Too Many Requests     | -                |
| **500**     | Internal Server Error | -                |
| **503**     | Service Unavailable   | -                |
| **507**     | Insufficient Storage  | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
