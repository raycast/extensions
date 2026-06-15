# RoomApi

All URIs are relative to *https://192.168.1.0*

| Method                                  | HTTP request                               | Description |
| --------------------------------------- | ------------------------------------------ | ----------- |
| [**createRoom**](RoomApi.md#createroom) | **POST** /clip/v2/resource/room            | Create room |
| [**deleteRoom**](RoomApi.md#deleteroom) | **DELETE** /clip/v2/resource/room/{roomId} | Delete room |
| [**getRoom**](RoomApi.md#getroom)       | **GET** /clip/v2/resource/room/{roomId}    | Get room.   |
| [**getRooms**](RoomApi.md#getrooms)     | **GET** /clip/v2/resource/room             | List rooms  |
| [**updateRoom**](RoomApi.md#updateroom) | **PUT** /clip/v2/resource/room/{roomId}    | Update room |

## createRoom

> UpdateDevice200Response createRoom(roomPut)

Create room

Create a new room

### Example

```ts
import { Configuration, RoomApi } from "@openhue/client";
import type { CreateRoomRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new RoomApi(config);

  const body = {
    // RoomPut (optional)
    roomPut: {
      children: [{ rid: "00afc7d2-bae5-4613-8cd8-5ba0d064a572", rtype: "light" }],
      metadata: { name: "TV Room", archetype: "tv" },
    },
  } satisfies CreateRoomRequest;

  try {
    const data = await api.createRoom(body);
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

## deleteRoom

> UpdateDevice200Response deleteRoom(roomId)

Delete room

Delete a single room from its given &#x60;{roomId}&#x60;

### Example

```ts
import { Configuration, RoomApi } from "@openhue/client";
import type { DeleteRoomRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new RoomApi(config);

  const body = {
    // string | ID of the room
    roomId: roomId_example,
  } satisfies DeleteRoomRequest;

  try {
    const data = await api.deleteRoom(body);
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
| **roomId** | `string` | ID of the room | [Defaults to `undefined`] |

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

## getRoom

> GetRooms200Response getRoom(roomId)

Get room.

Get details of a single room from its given &#x60;{roomId}&#x60;

### Example

```ts
import { Configuration, RoomApi } from "@openhue/client";
import type { GetRoomRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new RoomApi(config);

  const body = {
    // string | ID of the room
    roomId: roomId_example,
  } satisfies GetRoomRequest;

  try {
    const data = await api.getRoom(body);
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
| **roomId** | `string` | ID of the room | [Defaults to `undefined`] |

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
| **200**     | Room Success Response | -                |
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

## getRooms

> GetRooms200Response getRooms()

List rooms

List all available rooms

### Example

```ts
import { Configuration, RoomApi } from "@openhue/client";
import type { GetRoomsRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new RoomApi(config);

  try {
    const data = await api.getRooms();
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
| **200**     | Room Success Response | -                |
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

## updateRoom

> UpdateDevice200Response updateRoom(roomId, roomPut)

Update room

Update a single room from its given &#x60;{roomId}&#x60;

### Example

```ts
import {
  Configuration,
  RoomApi,
} from '@openhue/client';
import type { UpdateRoomRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new RoomApi(config);

  const body = {
    // string | ID of the room
    roomId: roomId_example,
    // RoomPut (optional)
    roomPut: ...,
  } satisfies UpdateRoomRequest;

  try {
    const data = await api.updateRoom(body);
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
| **roomId**  | `string`              | ID of the room | [Defaults to `undefined`] |
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
