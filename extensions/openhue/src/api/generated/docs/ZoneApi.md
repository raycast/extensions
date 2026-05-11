# ZoneApi

All URIs are relative to *https://192.168.1.0*

| Method                                  | HTTP request                               | Description |
| --------------------------------------- | ------------------------------------------ | ----------- |
| [**createZone**](ZoneApi.md#createzone) | **POST** /clip/v2/resource/zone            | Create zone |
| [**deleteZone**](ZoneApi.md#deletezone) | **DELETE** /clip/v2/resource/zone/{zoneId} | Delete Zone |
| [**getZone**](ZoneApi.md#getzone)       | **GET** /clip/v2/resource/zone/{zoneId}    | Get Zone.   |
| [**getZones**](ZoneApi.md#getzones)     | **GET** /clip/v2/resource/zone             | List zones  |
| [**updateZone**](ZoneApi.md#updatezone) | **PUT** /clip/v2/resource/zone/{zoneId}    | Update Zone |

## createZone

> UpdateDevice200Response createZone(roomPut)

Create zone

Create a new zone

### Example

```ts
import { Configuration, ZoneApi } from "@openhue/client";
import type { CreateZoneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ZoneApi(config);

  const body = {
    // RoomPut (optional)
    roomPut: {
      children: [{ rid: "00afc7d2-bae5-4613-8cd8-5ba0d064a572", rtype: "light" }],
      metadata: { name: "TV Zone", archetype: "tv" },
    },
  } satisfies CreateZoneRequest;

  try {
    const data = await api.createZone(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type                  | Description | Notes      |
| ----------- | --------------------- | ----------- | ---------- |
| **roomPut** | [RoomPut](RoomPut.md) |             | [Optional] |

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

## deleteZone

> UpdateDevice200Response deleteZone(zoneId)

Delete Zone

Delete a single Zone from its given &#x60;{zoneId}&#x60;

### Example

```ts
import { Configuration, ZoneApi } from "@openhue/client";
import type { DeleteZoneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ZoneApi(config);

  const body = {
    // string | ID of the Zone
    zoneId: zoneId_example,
  } satisfies DeleteZoneRequest;

  try {
    const data = await api.deleteZone(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name       | Type     | Description    | Notes                     |
| ---------- | -------- | -------------- | ------------------------- |
| **zoneId** | `string` | ID of the Zone | [Defaults to `undefined`] |

### Return type

[**UpdateDevice200Response**](UpdateDevice200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
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

## getZone

> GetRooms200Response getZone(zoneId)

Get Zone.

Get details of a single Zone from its given &#x60;{zoneId}&#x60;

### Example

```ts
import { Configuration, ZoneApi } from "@openhue/client";
import type { GetZoneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ZoneApi(config);

  const body = {
    // string | ID of the Zone
    zoneId: zoneId_example,
  } satisfies GetZoneRequest;

  try {
    const data = await api.getZone(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name       | Type     | Description    | Notes                     |
| ---------- | -------- | -------------- | ------------------------- |
| **zoneId** | `string` | ID of the Zone | [Defaults to `undefined`] |

### Return type

[**GetRooms200Response**](GetRooms200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description           | Response headers |
| ----------- | --------------------- | ---------------- |
| **200**     | Zone Success Response | -                |
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

## getZones

> GetRooms200Response getZones()

List zones

List all available zones

### Example

```ts
import { Configuration, ZoneApi } from "@openhue/client";
import type { GetZonesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ZoneApi(config);

  try {
    const data = await api.getZones();
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

[**GetRooms200Response**](GetRooms200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description           | Response headers |
| ----------- | --------------------- | ---------------- |
| **200**     | Zone Success Response | -                |
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

## updateZone

> UpdateDevice200Response updateZone(zoneId, roomPut)

Update Zone

Update a single Zone from its given &#x60;{zoneId}&#x60;

### Example

```ts
import {
  Configuration,
  ZoneApi,
} from '@openhue/client';
import type { UpdateZoneRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ZoneApi(config);

  const body = {
    // string | ID of the Zone
    zoneId: zoneId_example,
    // RoomPut (optional)
    roomPut: ...,
  } satisfies UpdateZoneRequest;

  try {
    const data = await api.updateZone(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type                  | Description    | Notes                     |
| ----------- | --------------------- | -------------- | ------------------------- |
| **zoneId**  | `string`              | ID of the Zone | [Defaults to `undefined`] |
| **roomPut** | [RoomPut](RoomPut.md) |                | [Optional]                |

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
