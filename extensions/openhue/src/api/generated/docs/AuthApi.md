# AuthApi

All URIs are relative to *https://192.168.1.0*

| Method                                               | HTTP request  | Description  |
| ---------------------------------------------------- | ------------- | ------------ |
| [**authenticate**](AuthApi.md#authenticateoperation) | **POST** /api | Authenticate |

## authenticate

> Array&lt;ResponseInner&gt; authenticate(authenticateRequest)

Authenticate

Authenticate to retrieve the HUE application key. Requires to go and press the button on the bridge

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '@openhue/client';
import type { AuthenticateOperationRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const api = new AuthApi();

  const body = {
    // AuthenticateRequest (optional)
    authenticateRequest: ...,
  } satisfies AuthenticateOperationRequest;

  try {
    const data = await api.authenticate(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name                    | Type                                          | Description | Notes      |
| ----------------------- | --------------------------------------------- | ----------- | ---------- |
| **authenticateRequest** | [AuthenticateRequest](AuthenticateRequest.md) |             | [Optional] |

### Return type

[**Array&lt;ResponseInner&gt;**](ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description            | Response headers |
| ----------- | ---------------------- | ---------------- |
| **200**     | Authentication Success | -                |
| **401**     | Unauthorized           | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
