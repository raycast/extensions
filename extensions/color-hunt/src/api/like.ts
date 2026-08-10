export default async function (id: string) {
  const res = await fetch("https://colorhunt.co/php/like.php", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `code=${id}`,
  });
  if (!res.ok) {
    throw new Error(`Failed executing like request: ${res.statusText}`);
  }
}
