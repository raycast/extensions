```fortran
double precision function dlansp (
        character norm,
        character uplo,
        integer n,
        double precision, dimension( * ) ap,
        double precision, dimension( * ) work
)
```

DLANSP  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
real symmetric matrix A,  supplied in packed form.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in DLANSP as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is supplied.
> = 'U':  Upper triangular part of A is supplied
> = 'L':  Lower triangular part of A is supplied

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, DLANSP is
> set to zero.

AP : DOUBLE PRECISION array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangle of the symmetric matrix A, packed
> columnwise in a linear array.  The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I' or '1' or 'O'; otherwise,
> WORK is not referenced.
