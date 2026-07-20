```fortran
subroutine zhptrd (
        character uplo,
        integer n,
        complex*16, dimension( * ) ap,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( * ) tau,
        integer info
)
```

ZHPTRD reduces a complex Hermitian matrix A stored in packed form to
real symmetric tridiagonal form T by a unitary similarity
transformation: Q\*\*H \* A \* Q = T.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.
> On exit, if UPLO = 'U', the diagonal and first superdiagonal
> of A are overwritten by the corresponding elements of the
> tridiagonal matrix T, and the elements above the first
> superdiagonal, with the array TAU, represent the unitary
> matrix Q as a product of elementary reflectors; if UPLO
> = 'L', the diagonal and first subdiagonal of A are over-
> written by the corresponding elements of the tridiagonal
> matrix T, and the elements below the first subdiagonal, with
> the array TAU, represent the unitary matrix Q as a product
> of elementary reflectors. See Further Details.

D : DOUBLE PRECISION array, dimension (N) [out]
> The diagonal elements of the tridiagonal matrix T:
> D(i) = A(i,i).

E : DOUBLE PRECISION array, dimension (N-1) [out]
> The off-diagonal elements of the tridiagonal matrix T:
> E(i) = A(i,i+1) if UPLO = 'U', E(i) = A(i+1,i) if UPLO = 'L'.

TAU : COMPLEX\*16 array, dimension (N-1) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
