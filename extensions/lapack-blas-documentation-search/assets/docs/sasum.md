```fortran
real function sasum (
        integer n,
        real, dimension(*) sx,
        integer incx
)
```

SASUM takes the sum of the absolute values.
uses unrolled loops for increment equal to one.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of SX
