# Shorten Amazon URL

Simply removes extraneous elements of an Amazon.com (US and others) product URL.

The current clipboard's contents must be an Amazon product URL. The clipboard will be replaced with the shortened URL.

## Examples:
| Store | Input | Output |
| :---- | :---- | :----- |
| US Store|`https://www.amazon.com/big_old_product_name/dp/ABCDEFGHIJ/ref=sr_1_30?a_bunch_of=tracking_stuff`|`https://www.amazon.com/dp/ABCDEFGHIJ`|
| UK Store|`https://www.amazon.co.uk/big_old_product_name/dp/ABCDEFGHIJ/ref=sr_1_30?a_bunch_of=tracking_stuff`|`https://www.amazon.co.uk/dp/ABCDEFGHIJ`|
| Amazon-shortened|`https://a.co/d/example`|`https://www.amazon.com/dp/ABCDEFGHIJ`|

