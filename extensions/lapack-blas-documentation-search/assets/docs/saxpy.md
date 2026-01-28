```fortran
subroutine saxpy (
        integer n,
        real sa,
        real, dimension(*) sx,
        integer incx,
        real, dimension(*) sy,
        integer incy
)
```

SAXPY constant times a vector plus a vector.
uses unrolled loops for increments equal to one.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SA : REAL [in]
> On entry, SA specifies the scalar alpha.

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of SX

SY : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of SY
