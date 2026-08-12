# ResourceApi

All URIs are relative to *https://192.168.1.0*

| Method                                          | HTTP request              | Description    |
| ----------------------------------------------- | ------------------------- | -------------- |
| [**getResources**](ResourceApi.md#getresources) | **GET** /clip/v2/resource | List resources |

## getResources

> GetResources200Response getResources()

List resources

API to retrieve all API resources

### Example

```ts
import { Configuration, ResourceApi } from "@openhue/client";
import type { GetResourcesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new ResourceApi(config);

  try {
    const data = await api.getResources();
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

[**GetResources200Response**](GetResources200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description               | Response headers |
| ----------- | ------------------------- | ---------------- |
| **200**     | Resource Success Response | -                |
| **401**     | Unauthorized              | -                |
| **403**     | Forbidden                 | -                |
| **404**     | Not Found                 | -                |
| **405**     | Method Not Allowed        | -                |
| **406**     | Not Acceptable            | -                |
| **409**     | Conflict                  | -                |
| **429**     | Too Many Requests         | -                |
| **500**     | Internal Server Error     | -                |
| **503**     | Service Unavailable       | -                |
| **507**     | Insufficient Storage      | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
