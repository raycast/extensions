```fortran
real function clanhe (
        character norm,
        character uplo,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) work
)
```

CLANHE  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex hermitian matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANHE as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> hermitian matrix A is to be referenced.
> = 'U':  Upper triangular part of A is referenced
> = 'L':  Lower triangular part of A is referenced

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, CLANHE is
> set to zero.

A : COMPLEX array, dimension (LDA,N) [in]
> The hermitian matrix A.  If UPLO = 'U', the leading n by n
> upper triangular part of A contains the upper triangular part
> of the matrix A, and the strictly lower triangular part of A
> is not referenced.  If UPLO = 'L', the leading n by n lower
> triangular part of A contains the lower triangular part of
> the matrix A, and the strictly upper triangular part of A is
> not referenced. Note that the imaginary parts of the diagonal
> elements need not be set and are assumed to be zero.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(N,1).

WORK : REAL array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I' or '1' or 'O'; otherwise,
> WORK is not referenced.
