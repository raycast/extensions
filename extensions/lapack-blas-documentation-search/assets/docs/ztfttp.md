```fortran
subroutine ztfttp (
        character transr,
        character uplo,
        integer n,
        complex*16, dimension( 0: * ) arf,
        complex*16, dimension( 0: * ) ap,
        integer info
)
```

ZTFTTP copies a triangular matrix A from rectangular full packed
format (TF) to standard packed format (TP).

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  ARF is in Normal format;
> = 'C':  ARF is in Conjugate-transpose format;

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

ARF : COMPLEX\*16 array, dimension ( N\*(N+1)/2 ), [in]
> On entry, the upper or lower triangular matrix A stored in
> RFP format. For a further discussion see Notes below.

AP : COMPLEX\*16 array, dimension ( N\*(N+1)/2 ), [out]
> On exit, the upper or lower triangular matrix A, packed
> columnwise in a linear array. The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
