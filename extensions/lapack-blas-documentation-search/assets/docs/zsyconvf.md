```fortran
subroutine zsyconvf (
        character uplo,
        character way,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) e,
        integer, dimension( * ) ipiv,
        integer info
)
```

If parameter WAY = 'C':
ZSYCONVF converts the factorization output format used in
ZSYTRF provided on entry in parameter A into the factorization
output format used in ZSYTRF_RK (or ZSYTRF_BK) that is stored
on exit in parameters A and E. It also converts in place details of
the interchanges stored in IPIV from the format used in ZSYTRF into
the format used in ZSYTRF_RK (or ZSYTRF_BK).

If parameter WAY = 'R':
ZSYCONVF performs the conversion in reverse direction, i.e.
converts the factorization output format used in ZSYTRF_RK
(or ZSYTRF_BK) provided on entry in parameters A and E into
the factorization output format used in ZSYTRF that is stored
on exit in parameter A. It also converts in place details of
the interchanges stored in IPIV from the format used in ZSYTRF_RK
(or ZSYTRF_BK) into the format used in ZSYTRF.

ZSYCONVF can also convert in Hermitian matrix case, i.e. between
formats used in ZHETRF and ZHETRF_RK (or ZHETRF_BK).

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are
> stored as an upper or lower triangular matrix A.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

WAY : CHARACTER\*1 [in]
> = 'C': Convert
> = 'R': Revert

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> 
> 1) If WAY ='C':
> 
> On entry, contains factorization details in format used in
> ZSYTRF:
> a) all elements of the symmetric block diagonal
> matrix D on the diagonal of A and on superdiagonal
> (or subdiagonal) of A, and
> b) If UPLO = 'U': multipliers used to obtain factor U
> in the superdiagonal part of A.
> If UPLO = 'L': multipliers used to obtain factor L
> in the superdiagonal part of A.
> 
> On exit, contains factorization details in format used in
> ZSYTRF_RK or ZSYTRF_BK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> 2) If WAY = 'R':
> 
> On entry, contains factorization details in format used in
> ZSYTRF_RK or ZSYTRF_BK:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.
> 
> On exit, contains factorization details in format used in
> ZSYTRF:
> a) all elements of the symmetric block diagonal
> matrix D on the diagonal of A and on superdiagonal
> (or subdiagonal) of A, and
> b) If UPLO = 'U': multipliers used to obtain factor U
> in the superdiagonal part of A.
> If UPLO = 'L': multipliers used to obtain factor L
> in the superdiagonal part of A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : COMPLEX\*16 array, dimension (N) [in,out]
> 
> 1) If WAY ='C':
> 
> On entry, just a workspace.
> 
> On exit, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i), i=2:N, E(1) is set to 0;
> If UPLO = 'L': E(i) = D(i+1,i), i=1:N-1, E(N) is set to 0.
> 
> 2) If WAY = 'R':
> 
> On entry, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i),i=2:N, E(1) not referenced;
> If UPLO = 'L': E(i) = D(i+1,i),i=1:N-1, E(N) not referenced.
> 
> On exit, is not changed

IPIV : INTEGER array, dimension (N) [in,out]
> 
> 1) If WAY ='C':
> On entry, details of the interchanges and the block
> structure of D in the format used in ZSYTRF.
> On exit, details of the interchanges and the block
> structure of D in the format used in ZSYTRF_RK
> ( or ZSYTRF_BK).
> 
> 1) If WAY ='R':
> On entry, details of the interchanges and the block
> structure of D in the format used in ZSYTRF_RK
> ( or ZSYTRF_BK).
> On exit, details of the interchanges and the block
> structure of D in the format used in ZSYTRF.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
