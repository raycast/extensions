# SugarDaddyDiabetes

A Raycast extension that helps monitor glucose data from Freestyle Libre 2 & 3 devices through LibreView integration.

## Important Note About Data Timing

Please be aware that the glucose readings shown in this extension may be slightly delayed compared to your actual sensor readings. This delay occurs because:

1. The data comes from LibreView's servers, not directly from your sensor
2. LibreView's API provides data that is typically 5-15 minutes behind real-time readings
3. The sync frequency depends on your sensor's connection to your phone and the phone's connection to LibreView

For the most up-to-date readings, please refer to your Libre sensor directly or the LibreLink app on your phone.

## Features

- 📊 Near real-time glucose monitoring through LibreView (5-15 minute delay)
- 📈 24-hour glucose average with visual gauge
- 🎯 Color-coded readings (In Range 🟢, Low 🟡, High 🔴)
- 🔔 Menu bar quick view for latest readings
- 🔄 Automatic updates every 5 minutes
- 📱 Support for both mmol/L and mg/dL units

## Prerequisites

Before using this extension, you need:

1. A LibreView account (https://www.libreview.com)
2. The LibreLinkUp mobile app installed and configured
3. A Freestyle Libre 2 or 3 sensor actively sharing data
4. Raycast installed on your Mac (https://raycast.com)

## Setup Instructions

1. Install the extension from the Raycast Store
2. Configure the required preferences:
   - LibreView Username (your account email)
   - LibreView Password
   - Preferred Glucose Unit (mmol/L or mg/dL)
3. If you haven't set up LibreLinkUp sharing:
   1. Download the LibreLinkUp app
   2. Log in with your LibreView credentials
   3. Add the account that has the Libre sensor
   4. Wait for them to accept the invitation
   5. Once connected, the extension will start showing data

## LibreView API Requirements

This extension uses the LibreView API with the following specifications:

- Authentication: Token-based with 50-minute expiry
- Rate Limiting: Implements automatic retry with 1-minute delay
- Data Refresh: Every 5 minutes for menu bar updates
- Data Latency: Readings may be 5-15 minutes behind real-time sensor data
- API Endpoints Used:
  - Login: `/llu/auth/login`
  - Connections: `/llu/connections`
  - Glucose Data: `/llu/connections/{patientId}/graph`

## Privacy Policy

SugarDaddyDiabetes takes your privacy and data security seriously:

1. Data Collection
   - The extension only collects necessary glucose data from LibreView
   - No personal data is stored locally
   - Credentials are securely stored in Raycast's preference system

2. Data Handling
   - All data is fetched in real-time from LibreView
   - No historical data is cached or stored
   - Data is only displayed within the Raycast interface

3. Data Transmission
   - All API communications use secure HTTPS
   - Authentication tokens are stored temporarily in memory
   - No data is shared with third parties

4. Security Measures
   - Credentials are stored securely using Raycast's encryption
   - API tokens expire after 50 minutes
   - Rate limiting protection is implemented
   - No sensitive data is logged or stored

## ⚠️ Important Medical Disclaimer

**THIS IS NOT A MEDICAL DEVICE AND SHOULD NOT BE USED AS ONE.**

This software is provided for informational purposes only and is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Never rely on this software for making medical decisions. Always seek the advice of your physician or other qualified health provider regarding any medical condition and before starting, changing, or stopping any medical treatment.

Key points:
- This is an unofficial extension and is not affiliated with Abbott, LibreView, or any medical device manufacturer
- Do not make treatment decisions based on the information provided by this extension
- The data shown may be delayed, inaccurate, or unavailable
- Always confirm readings with your actual medical device
- This extension is not a replacement for proper diabetes management tools
- In case of emergency, contact your healthcare provider or emergency services

## Limitation of Liability

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

By using this extension, you acknowledge and agree that:
1. The developers are not medical professionals or experts
2. The extension may contain errors or inaccuracies
3. You use the extension at your own risk
4. The developers are not liable for any decisions made based on the information provided
5. The developers are not responsible for any harm that may result from using this extension

## Troubleshooting

If you encounter issues:

1. Verify your LibreView credentials are correct
2. Ensure your LibreLinkUp connection is active
3. Check if your sensor is actively sharing data
4. Try refreshing the extension
5. Ensure you have a stable internet connection

For additional support, please open an issue on GitHub.

## Support & Contact

For questions, feedback, and compliments, please contact:
- Email: magiworksdev@gmail.com

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This extension uses the LibreView API but is not endorsed by or affiliated with Abbott Laboratories or LibreView
- Freestyle Libre is a trademark of Abbott Laboratories
- All trademarks, service marks, trade names, product names and logos are the property of their respective owners