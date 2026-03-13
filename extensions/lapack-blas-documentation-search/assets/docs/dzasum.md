```fortran
double precision function dzasum (
        integer n,
        complex*16, dimension(*) zx,
        integer incx
)
```

DZASUM takes the sum of the (|Re(.)| + |Im(.)|)'s of a complex vector and
returns a double precision result.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

ZX : COMPLEX\*16 array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of ZX
