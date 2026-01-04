# Security

> Best practices for securing your webhook endpoints

## Overview

To protect your webhook endpoints from malicious requests, we've implemented RSA-SHA256 signature verification. Every webhook request from our system includes cryptographic signatures in the headers that you can verify using our public key to ensure the request genuinely came from us.

**Why This Matters**: Without signature verification, anyone could send fake webhook requests to your endpoints. This system ensures only legitimate requests from our platform reach your application.

## How It Works

We use **RSA-SHA256** digital signatures with **2048-bit keys**:

1. We sign each webhook request with our private key
2. You verify the signature using our public key
3. If verification passes, you know the request is authentic

## Request Headers

Every webhook request includes these security headers:

| Header                | Description                  | Example         |
| --------------------- | ---------------------------- | --------------- |
| `X-Webhook-Signature` | Base64-encoded RSA signature | `iJ0S7p8K2n...` |
| `X-Webhook-Timestamp` | Unix timestamp (seconds)     | `1704067200`    |

## Signature Construction

We create the signature by concatenating three components:

```
{timestamp}.{url}.{body_sha256_hex}
```

**Example**:

```
1704067200.https://api.yourapp.com/webhooks.a1b2c3d4e5f6...
```

Where:

- `timestamp`: Request timestamp (matches `X-Webhook-Timestamp`)
- `url`: Complete webhook URL (including query parameters)
- `body_sha256_hex`: SHA256 hash of the request body in hex format

## Get Our Public Key

### API Endpoint

```http theme={null}
GET /v1/webhook/public_key
```

### Response Format

```json theme={null}
{
  "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "algorithm": "RSA-SHA256",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Pro Tip**: Cache this public key! Don't fetch it on every webhook request.

## Implementation Examples

<Tabs>
  <Tab title="Python">
    ```python  theme={null}
    import base64
    import hashlib
    import time
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.exceptions import InvalidSignature

    def verify_webhook_signature(
        public_key_pem: str,
        url: str,
        body: bytes,
        signature_b64: str,
        timestamp: str
    ) -> bool:
        """
        Verify webhook signature to ensure request authenticity.

        Args:
            public_key_pem: PEM-formatted public key
            url: Complete webhook URL
            body: Raw request body (bytes)
            signature_b64: Base64-encoded signature from X-Webhook-Signature header
            timestamp: Timestamp string from X-Webhook-Timestamp header

        Returns:
            True if signature is valid, False otherwise
        """

        # 1. Verify timestamp is recent (prevents replay attacks)
        current_time = int(time.time())
        request_time = int(timestamp)
        if abs(current_time - request_time) > 300:  # 5 minute window
            print(f"Request timestamp {request_time} is outside acceptable range")
            return False

        # 2. Reconstruct the signed content
        body_hash = hashlib.sha256(body).hexdigest()
        signature_content = f"{timestamp}.{url}.{body_hash}".encode('utf-8')

        # 3. Hash the content (this is what was actually signed)
        content_hash = hashlib.sha256(signature_content).digest()

        # 4. Load the public key
        try:
            public_key = serialization.load_pem_public_key(public_key_pem.encode())
        except Exception as e:
            print(f"Failed to load public key: {e}")
            return False

        # 5. Decode the signature
        try:
            signature = base64.b64decode(signature_b64)
        except Exception as e:
            print(f"Failed to decode signature: {e}")
            return False

        # 6. Verify the signature
        try:
            public_key.verify(
                signature,
                content_hash,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            print("Signature verification failed")
            return False

    # Flask/Django Example
    def handle_webhook(request):
        """Example webhook handler with signature verification"""

        # Extract headers
        signature = request.headers.get('X-Webhook-Signature')
        timestamp = request.headers.get('X-Webhook-Timestamp')

        if not signature or not timestamp:
            return 400, "Missing required headers"

        # Get cached public key (implement your caching strategy)
        public_key = get_cached_public_key()

        # Verify the signature
        is_valid = verify_webhook_signature(
            public_key,
            request.url,
            request.body,
            signature,
            timestamp
        )

        if not is_valid:
            return 401, "Invalid signature"

        # Process your webhook logic here
        webhook_data = request.json
        process_webhook_event(webhook_data)

        return 200, "OK"
    ```

  </Tab>

  <Tab title="Node.js">
    ```javascript  theme={null}
    const crypto = require('crypto');

    function verifyWebhookSignature({
      publicKeyPem,
      url,
      body,
      signatureB64,
      timestamp
    }) {
      // 1. Check timestamp freshness (5-minute window)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp);
      if (Math.abs(currentTime - requestTime) > 300) {
        console.error(`Timestamp ${requestTime} is outside acceptable range`);
        return false;
      }

      // 2. Recreate the signed content
      const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
      const signatureContent = `${timestamp}.${url}.${bodyHash}`;

      // 3. Hash the content
      const contentHash = crypto.createHash('sha256').update(signatureContent).digest();

      // 4. Verify signature
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(contentHash);
        return verifier.verify(publicKeyPem, signatureB64, 'base64');
      } catch (error) {
        console.error('Signature verification failed:', error.message);
        return false;
      }
    }

    // Express.js middleware example
    function webhookSignatureMiddleware(req, res, next) {
      const signature = req.headers['x-webhook-signature'];
      const timestamp = req.headers['x-webhook-timestamp'];

      if (!signature || !timestamp) {
        return res.status(400).json({ error: 'Missing required headers' });
      }

      // Reconstruct full URL
      const protocol = req.protocol;
      const host = req.get('host');
      const originalUrl = req.originalUrl;
      const fullUrl = `${protocol}://${host}${originalUrl}`;

      // Get cached public key
      const publicKey = getCachedPublicKey();

      // Verify signature
      const isValid = verifyWebhookSignature({
        publicKeyPem: publicKey,
        url: fullUrl,
        body: req.rawBody, // Make sure to capture raw body
        signatureB64: signature,
        timestamp: timestamp
      });

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      next();
    }

    // Usage with Express
    const express = require('express');
    const app = express();

    // Important: Capture raw body before JSON parsing
    app.use('/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
      req.rawBody = req.body;
      req.body = JSON.parse(req.body.toString());
      next();
    });

    app.use('/webhooks', webhookSignatureMiddleware);

    app.post('/webhooks', (req, res) => {
      // Your webhook logic here
      console.log('Verified webhook received:', req.body);
      res.status(200).send('OK');
    });
    ```

  </Tab>

  <Tab title="Go">
    ```go  theme={null}
    package main

    import (
        "crypto"
        "crypto/rsa"
        "crypto/sha256"
        "crypto/x509"
        "encoding/base64"
        "encoding/pem"
        "fmt"
        "io"
        "math"
        "net/http"
        "strconv"
        "time"
    )

    // VerifyWebhookSignature verifies the authenticity of a webhook request
    func VerifyWebhookSignature(
        publicKeyPEM []byte,
        url string,
        body []byte,
        signatureB64 string,
        timestamp int64,
    ) error {
        // 1. Check timestamp freshness (5-minute window)
        now := time.Now().Unix()
        if math.Abs(float64(now-timestamp)) > 300 {
            return fmt.Errorf("timestamp %d is outside acceptable range", timestamp)
        }

        // 2. Reconstruct signed content
        bodyHash := sha256.Sum256(body)
        bodyHashHex := fmt.Sprintf("%x", bodyHash)
        signatureContent := fmt.Sprintf("%d.%s.%s", timestamp, url, bodyHashHex)

        // 3. Hash the content
        contentHash := sha256.Sum256([]byte(signatureContent))

        // 4. Parse public key
        block, _ := pem.Decode(publicKeyPEM)
        if block == nil {
            return fmt.Errorf("failed to parse PEM block")
        }

        publicKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
        if err != nil {
            return fmt.Errorf("failed to parse public key: %w", err)
        }

        publicKey, ok := publicKeyInterface.(*rsa.PublicKey)
        if !ok {
            return fmt.Errorf("not an RSA public key")
        }

        // 5. Decode signature
        signature, err := base64.StdEncoding.DecodeString(signatureB64)
        if err != nil {
            return fmt.Errorf("failed to decode signature: %w", err)
        }

        // 6. Verify signature
        err = rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, contentHash[:], signature)
        if err != nil {
            return fmt.Errorf("signature verification failed: %w", err)
        }

        return nil
    }

    // HTTP handler example
    func webhookHandler(w http.ResponseWriter, r *http.Request) {
        // Extract headers
        signature := r.Header.Get("X-Webhook-Signature")
        timestampStr := r.Header.Get("X-Webhook-Timestamp")

        if signature == "" || timestampStr == "" {
            http.Error(w, "Missing required headers", http.StatusBadRequest)
            return
        }

        // Parse timestamp
        timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
        if err != nil {
            http.Error(w, "Invalid timestamp format", http.StatusBadRequest)
            return
        }

        // Read request body
        body, err := io.ReadAll(r.Body)
        if err != nil {
            http.Error(w, "Failed to read request body", http.StatusBadRequest)
            return
        }

        // Reconstruct full URL
        scheme := "https"
        if r.TLS == nil {
            scheme = "http"
        }
        fullURL := fmt.Sprintf("%s://%s%s", scheme, r.Host, r.RequestURI)

        // Get cached public key (implement your caching)
        publicKey := getCachedPublicKey()

        // Verify signature
        err = VerifyWebhookSignature(publicKey, fullURL, body, signature, timestamp)
        if err != nil {
            http.Error(w, "Invalid signature", http.StatusUnauthorized)
            return
        }

        // Process webhook
        fmt.Printf("Verified webhook received: %s\n", string(body))
        w.WriteHeader(http.StatusOK)
    }

    func main() {
        http.HandleFunc("/webhook", webhookHandler)
        fmt.Println("Webhook server starting on :8080")
        http.ListenAndServe(":8080", nil)
    }
    ```

  </Tab>
</Tabs>

## Security Best Practices

### 🔑 **Always Cache the Public Key**

```python theme={null}
# ❌ Don't do this - too slow and unnecessary
def handle_webhook(request):
    public_key = requests.get('/v1/webhook/public_key').json()['public_key']
    # ... verify signature

# ✅ Do this - cache with reasonable TTL
class PublicKeyCache:
    def __init__(self, cache_ttl=3600):  # 1 hour
        self._key = None
        self._last_fetch = 0
        self._ttl = cache_ttl

    def get_key(self):
        if time.time() - self._last_fetch > self._ttl:
            self._refresh_key()
        return self._key
```

### 🕐 **Always Verify Timestamps**

```python theme={null}
# Prevents replay attacks - someone can't reuse old webhook requests
MAX_TIMESTAMP_AGE = 300  # 5 minutes

def is_timestamp_valid(timestamp_str):
    try:
        request_time = int(timestamp_str)
        current_time = int(time.time())
        age = abs(current_time - request_time)
        return age <= MAX_TIMESTAMP_AGE
    except ValueError:
        return False
```

### 🔒 **Use HTTPS Only**

```python theme={null}
# Always ensure your webhook endpoints use HTTPS
if not request.is_secure:
    return 400, "HTTPS required"
```

### 🚫 **Don't Leak Error Details**

```python theme={null}
# ❌ Don't expose internal details
if not verify_signature():
    return 401, f"Signature verification failed: {detailed_error}"

# ✅ Generic error messages
if not verify_signature():
    logger.warning(f"Invalid signature from {request.remote_addr}")
    return 401, "Unauthorized"
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
