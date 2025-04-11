# Sleet Raycast extension
additional documentaion


---

### Near CLI and RPC

- https://docs.near.org/tools/near-cli

RPC
mainnet:
- https://rpc.mainnet.near.org
- https://free.rpc.fastnear.com
testnet
- https://rpc.testnet.near.org
- https://test.rpc.fastnear.com



### Sleet Hello
contract
- hello.sleet.testnet
- hello.sleet.near

```sh
near view hello.sleet.testnet get_greeting --networkId testnet

near view hello.sleet.near get_greeting --networkId mainnet
```

### Awesome web4
contract
- awesomeweb4.testnet
- awesomeweb4.near

learn more about web4 at https://web4.near.page/

```sh
near call awesomeweb4.testnet add_app '{"app":{"title":"undefined","dapp_account_id":"","categories":["4"],"slug":"undefined","oneliner":"undefined","description":"undefined","logo_url":"undefined"}}' --accountId youraccount.testnet --deposit 0.1
```

Submitting an app requires a deposit of 0.1 NEAR. The dapp_account_id must match the account_id of the user who is submitting the app.




### Near Social
https://near.social/
https://onsocial.id/

contract
- v1.social08.testnet
- social.near


```sh
# View profile data
near view social.near get '{"keys":["youraccount.near/profile/**"]}'
near view social.near get '{"keys":["sleet.near/profile/**"]}'

# Set profile data
near call social.near set '{"data":{"your-account.near":{"profile":{"linktree":{"github":"https://github.com/yourusername","twitter":"https://twitter.com/yourhandle","website":"https://yourwebsite.com"}}}}}' --accountId your-account.near --amount 0.000000000000000000000001
```

### Meme Cooking
https://meme.cooking/board

contract
- meme-cooking.near
- factory.v10.meme-cooking.testnet


### Near Dapps

- https://onsocial.id/ - social on near
- https://meme.cooking/?referral=sleet.near - meme tokens on near
- https://near.pumpopoly.com/?invite=sleet.near - Virtual Real Estate Crypto Game on near
- https://dex.rhea.finance/points?code=zmDT0oI - DEX on near
- https://wallet.meteorwallet.app/wallet - meteor wallet
- https://namesky.app/ - near account marketplace

---

copyright: 2025 by sleet.near