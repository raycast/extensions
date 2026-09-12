```fortran
subroutine dlartv (
        integer n,
        double precision, dimension( * ) x,
        integer incx,
        double precision, dimension( * ) y,
        integer incy,
        double precision, dimension( * ) c,
        double precision, dimension( * ) s,
        integer incc
)
```

DLARTV applies a vector of real plane rotations to elements of the
real vectors x and y. For i = 1,2,...,n

( x(i) ) := (  c(i)  s(i) ) ( x(i) )
( y(i) )    ( -s(i)  c(i) ) ( y(i) )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be applied.

X : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCX)
> The vector x.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

Y : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCY)
> The vector y.

INCY : INTEGER [in]
> The increment between elements of Y. INCY > 0.

C : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [in]
> The cosines of the plane rotations.

S : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [in]
> The sines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C and S. INCC > 0.
