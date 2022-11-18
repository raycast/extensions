import axios from "axios";

export async function sendMessage(message: string, userID: string, botToken: string) {
  var url = "https://api.telegram.org";
  url += `/bot${botToken}/sendMessage?`;
  const params = new URLSearchParams();
  params.append("chat_id", userID);
  params.append("text", message);
  url += params.toString();
  await axios
    .get(url)
    .then(function (response: any) {
      console.log(response);
    })
    .catch(function (error: any) {
      console.log(error);
    });
}
